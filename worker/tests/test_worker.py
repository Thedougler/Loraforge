from worker.app.worker import add

def test_add_task():
    result = add.apply(args=[2, 3]).get()
    assert result == 5